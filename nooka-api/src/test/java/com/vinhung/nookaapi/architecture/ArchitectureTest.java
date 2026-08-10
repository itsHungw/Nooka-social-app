package com.vinhung.nookaapi.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(
        packages = "com.vinhung.nookaapi",
        importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule controllersDoNotDependOnPersistence = noClasses()
            .that().resideInAPackage("..controller..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("..entity..", "..repository..")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule publicApisDoNotExposePersistence = noClasses()
            .that().resideInAPackage("..api..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("..entity..", "..repository..")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule postDoesNotDependOnOtherModuleEntities = noClasses()
            .that().resideInAPackage("..post..")
            .should().dependOnClassesThat()
            .resideInAnyPackage("..user.entity..", "..spot.entity..");

    @ArchTest
    static final ArchRule onlyPostRepositoryPackageUsesPostRepository = noClasses()
            .that().resideOutsideOfPackage("..post.repository..")
            .should().dependOnClassesThat()
            .haveFullyQualifiedName(
                    "com.vinhung.nookaapi.post.repository.PostRepository");
}